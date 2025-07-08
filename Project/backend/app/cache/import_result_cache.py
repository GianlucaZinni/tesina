# backend/app/cache/import_result_cache.py
from uuid import uuid4

_cache = {}

def store_import_result(data):
    import_id = str(uuid4())
    _cache[import_id] = data
    return import_id

def get_import_result(import_id):
    return _cache.get(import_id)