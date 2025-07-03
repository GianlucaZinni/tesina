import os
from .config import DevConfig, QAConfig, ProdConfig

_CONFIG_MAP = {
    'dev': DevConfig,
    'qa': QAConfig,
    'prod': ProdConfig,
}

def get_config(env: str | None = None):
    """Return the configuration class for the given environment."""
    if env is None:
        env = os.getenv('APP_ENV', 'dev').lower()
    return _CONFIG_MAP.get(env, DevConfig)

__all__ = ['get_config', 'DevConfig', 'QAConfig', 'ProdConfig']
