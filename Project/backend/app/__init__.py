from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_config
from backend.app.helpers.functions import _load_collar_states

def create_app(config_object=None) -> FastAPI:
    if config_object is None:
        config_object = get_config()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        _load_collar_states()
        yield

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from backend.app.routes.static_files.endpoints import router as static_files_router
    from backend.app.routes.users.endpoints import router as users_router
    from backend.app.routes.api_gateway.endpoints import router as api_gateway_router
    from backend.app.routes.animals.endpoints import router as animals_router
    from backend.app.routes.collares.endpoints import router as collares_router
    from backend.app.routes.campos.endpoints import router as campos_router
    from backend.app.routes.parcelas.endpoints import router as parcelas_router
    from backend.app.routes.map.endpoints import router as map_router
    from backend.app.routes.home.endpoints import router as home_router

    app.include_router(static_files_router)
    app.include_router(users_router)
    app.include_router(api_gateway_router)
    app.include_router(animals_router)
    app.include_router(collares_router)
    app.include_router(campos_router)
    app.include_router(parcelas_router)
    app.include_router(map_router)
    app.include_router(home_router)

    from backend.app.routes.errors.handlers import register_error_handlers
    
    register_error_handlers(app)

    return app

__all__ = ["create_app"]
