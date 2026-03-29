from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import AEMUser, UserSettings


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AEMUser
        fields = ('id', 'full_name', 'email', 'role', 'is_active', 'created_at')
        read_only_fields = fields


class SignUpSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    role = serializers.ChoiceField(
        choices=[AEMUser.Roles.STUDENT, AEMUser.Roles.ORGANIZER],
        default=AEMUser.Roles.STUDENT,
        required=False,
    )

    def validate_full_name(self, value):
        full_name = value.strip()
        if not full_name:
            raise serializers.ValidationError('Full name is required.')
        return full_name

    def validate_email(self, value):
        email = value.strip().lower()
        if AEMUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        now = timezone.now()
        user = AEMUser(
            full_name=validated_data['full_name'],
            email=validated_data['email'],
            role=validated_data.get('role', AEMUser.Roles.STUDENT),
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        user.set_password(validated_data['password'])
        user.save()

        UserSettings.objects.create(
            user=user,
            notifications_enabled=True,
            theme=UserSettings.Themes.LIGHT,
            language_code='en',
            created_at=now,
            updated_at=now,
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        password = attrs['password']

        user = AEMUser.objects.filter(email__iexact=email).first()
        if user is None or not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        attrs['user'] = user
        return attrs
