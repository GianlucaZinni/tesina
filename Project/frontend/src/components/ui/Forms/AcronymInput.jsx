import { useState, useRef } from 'react';
import { Input } from '@/components/ui/shadcn/input';
import { ChevronDown } from 'lucide-react';

export default function AcronymInput({ value = '', onChange, options = [] }) {
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    const filtered = options.filter(opt =>
        opt.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <div className="relative w-full">
            <Input
                ref={inputRef}
                value={value}
                placeholder="Ej: ABCD (4 letras)"
                maxLength={4}
                onChange={e => {
                    const onlyLetters = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
                    if (onlyLetters.length <= 4) {
                        onChange?.(onlyLetters);
                    }
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 100)}
                className="appearance-none pr-8"
            />
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {open && filtered.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border bg-white text-sm shadow-md">
                    {filtered.map(opt => (
                        <li
                            key={opt}
                            onMouseDown={() => {
                                onChange?.(opt);
                                setOpen(false);
                                inputRef.current?.blur();
                            }}
                            className="cursor-pointer px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}