
import React from 'react';
import { Shield, Database, Cpu, Globe, Code, UserPlus, Server, Layers, Lock, Terminal } from 'lucide-react';

const TechnicalDocs: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-slate-900 mb-2">Especificaciones Técnicas 2026</h2>
        <p className="text-slate-500">Documentación de arquitectura, IA de vanguardia y persistencia en tiempo real con Supabase.</p>
      </div>

      {/* Cloud Infrastructure Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <Cpu className="text-indigo-600 w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Motor de IA (Gemini 3.0+)</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Code className="w-4 h-4 mt-0.5 text-indigo-500" />
              <span><strong>Modelo:</strong> gemini-2.5-flash (Actualizado a Feb 2026).</span>
            </li>
            <li className="flex items-start gap-2">
              <Globe className="w-4 h-4 mt-0.5 text-indigo-500" />
              <span><strong>Grounding:</strong> Google Search Index en tiempo real (2026).</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="text-emerald-600 w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Seguridad y Cifrado</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-emerald-500" />
              <span><strong>Contraseñas:</strong> Hash automático con Bcrypt vía Supabase Auth.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 text-emerald-500" />
              <span><strong>Política de Acceso:</strong> RLS (Row Level Security) habilitado por tabla.</span>
            </li>
            <li className="flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 text-emerald-500" />
              <span><strong>Triggers:</strong> Automatización PL/pgSQL para sincronización de perfiles.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* SQL Script Section */}
      <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="w-8 h-8 text-emerald-400" />
          <h3 className="text-2xl font-bold">Esquema SQL (Ejecutar en Supabase)</h3>
        </div>
        <div className="bg-black/40 rounded-3xl p-6 font-mono text-[10px] leading-relaxed border border-white/5 max-h-96 overflow-y-auto custom-scrollbar">
          <pre className="text-emerald-300">
            {`-- Crear tabla de perfiles extendida
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  available_investment NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Solo el dueño ve sus datos
CREATE POLICY "User Access" ON public.profiles 
FOR ALL USING (auth.uid() = id);

-- Trigger para creación automática
CREATE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, available_investment)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', ...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
          </pre>
        </div>
        <p className="mt-4 text-xs text-slate-400 italic">
          * Para seguridad fuerte de contraseñas, configurar la "Password Policy" en el dashboard de Supabase Auth.
        </p>
      </section>

      {/* Opportunity Data Model */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          Modelo de Datos: Oportunidad de Negocio 2026
        </h3>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700">Campo</th>
                <th className="px-6 py-4 font-bold text-slate-700">Tipo</th>
                <th className="px-6 py-4 font-bold text-slate-700">Descripción (Contexto 2026)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-4 font-mono text-xs">initial_investment</td>
                <td className="px-6 py-4 text-slate-500 italic">Numeric</td>
                <td className="px-6 py-4">Inversión requerida ajustada a la inflación de 2026.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-xs">suppliers</td>
                <td className="px-6 py-4 text-slate-500 italic">JSONB[]</td>
                <td className="px-6 py-4">Proveedores con logística optimizada por drones o IA.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-xs">marketing_strategy</td>
                <td className="px-6 py-4 text-slate-500 italic">Text</td>
                <td className="px-6 py-4">Estrategias centradas en experiencias inmersivas de 2026.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default TechnicalDocs;
