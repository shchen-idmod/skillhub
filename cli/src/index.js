#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import extractZip from 'extract-zip'

const API_BASE = process.env.SKILLHUB_API ?? 'https://skillhub-production-7de0.up.railway.app'
const SKILLS_DIR = '.skillhub'

const api = axios.create({ baseURL: API_BASE })

function parseGithubUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1]
    if (parts.length >= 4 && parts[2] === 'tree') {
      return { owner, repo, branch: parts[3], folderPath: parts.slice(4).join('/') }
    }
    return { owner, repo, branch: 'HEAD', folderPath: '' }
  } catch {
    return null
  }
}

async function fetchGithubFiles(owner, repo, branch, folderPath) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const response = await axios.get(apiUrl, {
    headers: { Accept: 'application/vnd.github.v3+json' }
  })
  const prefix = folderPath ? folderPath + '/' : ''
  return response.data.tree.filter(
    item => item.type === 'blob' && item.path.startsWith(prefix)
  ).map(item => ({
    path: item.path,
    relativePath: item.path.slice(prefix.length),
    downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`
  }))
}

function fail(spinner, msg) {
  spinner.stop()
  console.error(chalk.red('✖ ' + msg))
  process.exitCode = 1
}

program
  .name('gf-skillhub-cli')
  .description('SkillHub CLI')
  .version('1.0.4')

program
  .command('add <skill>')
  .description('Install a skill into the current project')
  .option('--agent <agent>', 'Target agent (e.g. claude-code)', 'all')
  .option('--dir <dir>', 'Install directory', SKILLS_DIR)
  .action(async (skill, opts) => {
    const spinner = ora(`Resolving ${chalk.bold(skill)}`).start()

    try {
      let githubUrl = null
      let registrySlug = null
      let version = 'unknown'

      if (skill.startsWith('https://github.com/')) {
        githubUrl = skill
      } else {
        const parts = skill.split('/')
        if (!parts[0] || !parts[1]) {
          fail(spinner, 'Skill must be a GitHub URL or namespace/name format')
          return
        }
        registrySlug = skill

        let install
        try {
          const res = await api.get(`/skills/${parts[0]}/${parts[1]}/install`)
          install = res.data
        } catch (err) {
          const status = err.response?.status
          if (status === 404) {
            fail(spinner, `Skill "${skill}" not found in registry at ${API_BASE}\n  Set SKILLHUB_API=<your-backend-url> if using a remote registry.`)
          } else if (!err.response) {
            fail(spinner, `Cannot connect to registry at ${API_BASE}\n  Set SKILLHUB_API=<your-backend-url> to use a remote registry.`)
          } else {
            fail(spinner, `Registry error: ${err.response?.data?.detail ?? err.message}`)
          }
          return
        }

        version = install.version
        if (!install.download_url && !install.github_url) {
          fail(spinner, 'No download source available for this skill')
          return
        }

        githubUrl = install.download_url ? null : (install.github_url ?? null)
        if (install.download_url) {
          const installDir = path.join(process.cwd(), opts.dir, parts[0], parts[1])
          fs.mkdirSync(installDir, { recursive: true })
          spinner.text = 'Downloading from registry...'
          const tmpZip = path.join(os.tmpdir(), `skillhub-${parts[0]}-${parts[1]}.zip`)
          const res = await axios.get(install.download_url, { responseType: 'stream' })
          await pipeline(res.data, createWriteStream(tmpZip))
          spinner.text = 'Extracting...'
          await extractZip(tmpZip, { dir: installDir })
          fs.unlinkSync(tmpZip)
          const installedFiles = install.files?.length ? install.files
            : fs.readdirSync(installDir).filter(f => f !== 'manifest.json')
          const manifest = {
            slug: registrySlug, version, source: 'skillhub-registry',
            installedAt: new Date().toISOString(), agent: opts.agent, files: installedFiles
          }
          fs.writeFileSync(path.join(installDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
          spinner.succeed(chalk.green('Installed ') + chalk.bold(skill) + ' from ' + chalk.cyan('registry'))
          return
        }
      }

      const parsed = parseGithubUrl(githubUrl)
      if (!parsed) {
        fail(spinner, 'Cannot parse GitHub URL: ' + githubUrl)
        return
      }

      const skillDirName = parsed.folderPath
        ? parsed.folderPath.split('/').pop()
        : parsed.repo
      const installDir = path.join(process.cwd(), opts.dir, parsed.owner, skillDirName)
      fs.mkdirSync(installDir, { recursive: true })

      spinner.text = 'Fetching file list from GitHub...'
      const files = await fetchGithubFiles(parsed.owner, parsed.repo, parsed.branch, parsed.folderPath)
      if (!files.length) {
        fail(spinner, 'No files found at: ' + githubUrl)
        return
      }

      spinner.text = `Downloading ${files.length} file(s) from GitHub...`
      for (const file of files) {
        const destPath = path.join(installDir, file.relativePath)
        fs.mkdirSync(path.dirname(destPath), { recursive: true })
        const res = await axios.get(file.downloadUrl, { responseType: 'stream' })
        await pipeline(res.data, createWriteStream(destPath))
      }

      const installedFiles = files.map(f => f.relativePath)
      const manifest = {
        slug: registrySlug ?? githubUrl,
        version,
        source: githubUrl,
        installedAt: new Date().toISOString(),
        agent: opts.agent,
        files: installedFiles,
      }
      fs.writeFileSync(path.join(installDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

      spinner.succeed(chalk.green('Installed ') + chalk.bold(skill) + ' from ' + chalk.cyan('GitHub'))
      console.log()
      console.log(chalk.dim('  Source: ' + githubUrl))
      console.log(chalk.dim('  Files:  ' + installedFiles.join(', ')))

    } catch (err) {
      const status = err.response?.status
      if (status === 404) {
        fail(spinner, `Skill "${skill}" not found in registry at ${API_BASE}`)
      } else if (!err.response) {
        fail(spinner, `Cannot connect to registry at ${API_BASE}\n  Set SKILLHUB_API=<your-backend-url> to override.`)
      } else {
        const msg = err.response?.data?.detail || err.message || `HTTP ${status}`
        fail(spinner, 'Failed to install ' + skill + ': ' + msg)
      }
    }
  })

program
  .command('list')
  .description('List installed skills in this project')
  .action(() => {
    const baseDir = path.join(process.cwd(), SKILLS_DIR)
    if (!fs.existsSync(baseDir)) {
      console.log(chalk.dim('No skills installed yet.'))
      return
    }

    const installed = []
    const namespaces = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory())
    for (const ns of namespaces) {
      const nsDir = path.join(baseDir, ns)
      const skills = fs.readdirSync(nsDir).filter(f => fs.statSync(path.join(nsDir, f)).isDirectory())
      for (const sk of skills) {
        const manifestPath = path.join(nsDir, sk, 'manifest.json')
        if (fs.existsSync(manifestPath)) {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          installed.push(m)
        }
      }
    }

    if (!installed.length) {
      console.log(chalk.dim('No skills installed.'))
      return
    }

    console.log(chalk.bold('\n  Installed skills (' + installed.length + ')\n'))
    for (const s of installed) {
      console.log('  ' + chalk.green('●') + ' ' + chalk.bold(s.slug) + ' ' + chalk.dim('v' + s.version))
      console.log('    ' + chalk.dim('Source: ' + s.source))
      console.log('    ' + chalk.dim('Agent:  ' + s.agent))
      console.log()
    }
  })

program
  .command('remove <skill>')
  .description('Remove an installed skill')
  .action((skill) => {
    const parts = skill.split('/')
    const skillDir = path.join(process.cwd(), SKILLS_DIR, parts[0], parts[1])
    if (!fs.existsSync(skillDir)) {
      console.error(chalk.red('Skill not installed: ' + skill))
      process.exitCode = 1
      return
    }
    fs.rmSync(skillDir, { recursive: true })
    console.log(chalk.green('Removed ' + skill))
  })

program
  .command('search <query>')
  .description('Search the skill registry')
  .action(async (query) => {
    const spinner = ora('Searching for ' + query + '...').start()
    try {
      const { data } = await api.get('/skills', { params: { q: query, page_size: 8 } })
      spinner.stop()
      if (!data.items.length) {
        console.log(chalk.dim('No results for ' + query))
        return
      }
      console.log(chalk.bold('\n  ' + data.total + ' results for ' + query + '\n'))
      for (const s of data.items) {
        console.log('  ' + chalk.green(s.slug) + ' ' + chalk.dim('v' + s.version))
        console.log('  ' + chalk.dim(s.description.slice(0, 80)))
        console.log('    ' + chalk.cyan('npx skills-cli add ' + s.slug))
        console.log()
      }
    } catch (err) {
      fail(spinner, 'Search failed: ' + err.message)
    }
  })

program.parse()
