from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_alter_user_managers"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="firebase_uid",
            field=models.CharField(
                blank=True,
                default=None,
                max_length=128,
                null=True,
                unique=True,
            ),
        ),
    ]
