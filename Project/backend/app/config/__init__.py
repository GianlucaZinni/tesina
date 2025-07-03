import os
from .config import DEVConfig, QAConfig, PRODConfig

_CONFIG_MAP = {
    'dev': DEVConfig,
    'qa': QAConfig,
    'prod': PRODConfig,
}

def get_config(env: str | None = None):
    """Return the configuration class for the given environment."""
    if env is None:
        env = os.getenv('APP_ENV', 'dev').lower()
    return _CONFIG_MAP.get(env, DEVConfig)

__all__ = ['get_config', 'DevConfig', 'QAConfig', 'ProdConfig']