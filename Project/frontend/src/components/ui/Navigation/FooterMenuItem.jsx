// ~/Project/frontend/src/components/ui/Navigation/FooterMenuItem.jsx
export default function FooterMenuItem({ label, icon, path, current, navigate, full = false, onClick }) {
    const handleClick = () => {
        navigate(path)
        if (onClick) onClick()
    }

    return (
        <button
            onClick={handleClick}
            className={`h-full w-full flex flex-col items-center justify-center flex-1 py-1
                        ${current === path ? 'text-green-600 font-semibold' : 'text-gray-700'}
                        transition-all`}
        >
            {/* Ícono */}
            <span className="text-lg">{icon}</span>

            {/* Texto solo si >= 400px */}
            <span className="text-[10px] min-[400px]:block hidden leading-none">{label}</span>
        </button>
    )
}
