import { Input } from "@/components/ui/shadcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/shadcn/select";

export default function ColumnFilter({ column }) {
    if (!column.getCanFilter()) return null;

    const placeholder = column.columnDef.header || column.id;

    const isSelect = ["tipo", "especie", "sexo", "raza", "parcela"].includes(column.id);

    if (isSelect) {
        const rawOptions = Array.from(
            new Set(
                column.getFacetedRowModel()?.rows
                    ?.map(row => row.getValue(column.id))
                    ?.filter(opt => opt !== undefined && opt !== null && opt !== '')
                    ?.map(opt => String(opt).trim())
            )
        ).sort((a, b) => a.localeCompare(b));
    
        return (
            <Select
                value={column.getFilterValue() || ''}
                onValueChange={val => column.setFilterValue(val === 'all' ? '' : val)}
            >
                <SelectTrigger className="w-full h-8 text-xs text-center">
                    <SelectValue placeholder={`${placeholder}`} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {rawOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <Input
            value={column.getFilterValue() || ''}
            onChange={e => column.setFilterValue(e.target.value)}
            placeholder={`${placeholder}`}
            className="w-full h-8 text-xs text-center"
        />
    );
}
