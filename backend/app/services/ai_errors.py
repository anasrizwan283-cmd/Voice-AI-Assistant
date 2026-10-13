class AIConfigurationError(Exception):
    """Raised when the configured AI provider cannot be used."""


class AIProviderError(Exception):
    """Raised when an AI provider returns an unusable response."""
