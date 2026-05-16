import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = [
  {
    href: "/admin/participants",
    title: "Participantes",
    description: "Crear cuentas y confirmar pagos.",
  },
  {
    href: "/admin/fixture",
    title: "Fixture",
    description: "Registrar resultados y calcular puntos.",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Panel de Administración</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
