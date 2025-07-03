// ~/Project/frontend/src/effects/ripple.js
export function crearRipple(event) {
    const ripple = document.createElement('div')
    ripple.className = 'ripple-effect'
    ripple.style.left = `${event.clientX}px`
    ripple.style.top = `${event.clientY}px`
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
}