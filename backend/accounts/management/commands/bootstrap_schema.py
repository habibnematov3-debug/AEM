from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connection, transaction
import sqlparse


class Command(BaseCommand):
    help = 'Create the AEM MVP PostgreSQL schema in the current database if it does not exist.'

    def handle(self, *args, **options):
        existing_tables = set(connection.introspection.table_names())
        required_tables = {'users', 'settings', 'events', 'participations'}

        if required_tables.issubset(existing_tables):
            self.stdout.write(self.style.SUCCESS('AEM schema already exists.'))
            return

        schema_path = Path(__file__).resolve().parents[4] / 'database' / 'aem_schema_v1.sql'
        sql_script = schema_path.read_text(encoding='utf-8')
        statements = [statement.strip() for statement in sqlparse.split(sql_script) if statement.strip()]

        with transaction.atomic():
            with connection.cursor() as cursor:
                for statement in statements:
                    cursor.execute(statement)

        self.stdout.write(self.style.SUCCESS('AEM schema created successfully.'))
