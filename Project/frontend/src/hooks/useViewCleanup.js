// hooks/useViewCleanup.js
import { useEffect } from 'react'

export default function useViewCleanup(callback) {
    useEffect(() => {
        return () => {
            if (typeof callback === 'function') {
                callback()
            }
        }
    }, [])
}
