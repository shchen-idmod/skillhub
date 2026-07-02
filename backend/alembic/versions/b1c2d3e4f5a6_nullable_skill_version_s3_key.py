"""nullable skill_version s3_key

Revision ID: b1c2d3e4f5a6
Revises: a87e4a6c40aa
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a87e4a6c40aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('skill_versions') as batch_op:
        batch_op.alter_column('s3_key', existing_type=sa.String(512), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('skill_versions') as batch_op:
        batch_op.alter_column('s3_key', existing_type=sa.String(512), nullable=False)
