# backend/tests/factories.py
# Fabriques factory-boy pour générer des objets de test.

import factory
from django.contrib.auth.models import User

TEST_PASSWORD = "Passw0rd!123"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@belivay.test")
    first_name = "Test"
    last_name = "User"
    # Définit le mot de passe haché après création ; le clair reste TEST_PASSWORD
    password = factory.PostGenerationMethodCall("set_password", TEST_PASSWORD)