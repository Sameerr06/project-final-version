from django.db import migrations, models
import secrets


def populate_tokens(apps, schema_editor):
    """Generate access tokens for any existing students that don't have one."""
    Student = apps.get_model('quiz_api', 'Student')
    for student in Student.objects.filter(access_token=''):
        student.access_token = secrets.token_urlsafe(32)
        student.save(update_fields=['access_token'])


class Migration(migrations.Migration):
    """[C4/Section 5] Add access_token field to Student model."""
    dependencies = [('quiz_api', '0008_add_round2_question')]
    operations = [
        migrations.AddField(
            model_name='student',
            name='access_token',
            field=models.CharField(max_length=64, blank=True, default=''),
        ),
        migrations.RunPython(populate_tokens, migrations.RunPython.noop),
    ]
