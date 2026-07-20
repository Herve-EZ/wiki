from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SiteConfiguration",
            fields=[
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("site_name", models.CharField(default="WikiCollab", max_length=120)),
                (
                    "tagline",
                    models.CharField(
                        blank=True,
                        default="Wiki collaboratif self-hosted — vos données restent chez vous.",
                        max_length=200,
                    ),
                ),
                (
                    "logo_svg",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Markup SVG complet du logo. Laisser vide pour le logo par défaut.",
                    ),
                ),
                ("primary_color", models.CharField(default="#534ab7", max_length=9)),
                ("primary_color_dark", models.CharField(default="#8b84e8", max_length=9)),
                ("support_email", models.EmailField(blank=True, default="", max_length=254)),
                (
                    "login_title",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Titre de la page de connexion. Vide → « Connexion à <nom> ».",
                        max_length=120,
                    ),
                ),
                ("login_subtitle", models.CharField(blank=True, default="", max_length=300)),
                ("allow_registration", models.BooleanField(default=True)),
                ("enable_email_login", models.BooleanField(default=True)),
                ("enable_google", models.BooleanField(default=True)),
                ("enable_github", models.BooleanField(default=True)),
                ("enable_microsoft", models.BooleanField(default=True)),
                ("enable_saml", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "Configuration de la plateforme",
                "verbose_name_plural": "Configuration de la plateforme",
            },
        ),
    ]
