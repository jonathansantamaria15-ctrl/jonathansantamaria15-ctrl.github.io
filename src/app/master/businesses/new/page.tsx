import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createBusinessAction } from "../actions";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-lg font-semibold text-chrome-text">Nuevo local</h1>
      <p className="mb-4 text-sm text-chrome-muted">
        Lo minimo para empezar. El resto (carta, tema, mesas, QR...) se configura despues aqui o,
        mas rapido, pidiendoselo a Claude por MCP.
      </p>
      <Card>
        <form action={createBusinessAction} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Nombre del establecimiento</Label>
            <Input id="name" name="name" required placeholder="Restaurante La Marina" />
          </div>
          <div>
            <Label htmlFor="tagline">Eslogan (opcional)</Label>
            <Input id="tagline" name="tagline" placeholder="Cocina de mercado frente al mar" />
          </div>
          <div>
            <Label htmlFor="ownerEmail">Email del propietario (opcional)</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" placeholder="propietario@email.com" />
          </div>
          <Button type="submit">Crear establecimiento</Button>
        </form>
      </Card>
    </div>
  );
}
