import { Input } from "@/components/ui/shadcn/input";

export default function SearchBar({ globalFilter, setGlobalFilter }) {
    return (
        <Input
            placeholder="Buscar..."
            value={globalFilter || ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full max-w-sm"
        />
    );
}
