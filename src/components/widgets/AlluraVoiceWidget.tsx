"use client";

import { useEffect, useRef, useState } from "react";

// Todos los campos opcionales a proposito: el schema real configurado por el
// cliente en ElevenLabs puede no coincidir exactamente con el manual original
// (ya paso con el nombre de la tool), asi que el widget no debe romperse si
// el agente manda menos datos o con otras claves de las esperadas.
interface TransferToWhatsAppArgs {
  nombre?: string;
  name?: string;
  pais_residencia?: string;
  country?: string;
  idioma?: string;
  language?: string;
  servicio_interes?: string;
  service?: string;
  fecha_viaje?: string;
  travel_date?: string;
  resumen_conversacion?: string;
  summary?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "agent-id": string;
          "avatar-image-url"?: string;
          "avatar-orb-color-1"?: string;
          "avatar-orb-color-2"?: string;
        },
        HTMLElement
      >;
    }
  }
}

const SCRIPT_ID = "elevenlabs-convai-script";
const SCRIPT_SRC = "https://elevenlabs.io/convai-widget/index.js";

function buildWhatsAppMessage(args: TransferToWhatsAppArgs): string {
  const idiomaRaw = args.idioma ?? args.language ?? "";
  const isEnglish = idiomaRaw.toLowerCase().startsWith("en") || idiomaRaw.toLowerCase().includes("ingl");

  const nombre = args.nombre || args.name || (isEnglish ? "Patient" : "Paciente");
  const origen = args.pais_residencia || args.country || (isEnglish ? "Not specified" : "No especificado");
  const fecha = args.fecha_viaje || args.travel_date || (isEnglish ? "To be defined" : "Por definir");
  const servicio = args.servicio_interes || args.service || (isEnglish ? "Not specified" : "No especificado");
  const resumen = args.resumen_conversacion || args.summary || (isEnglish ? "See call transcript." : "Ver transcripción de la llamada.");

  return isEnglish
    ? `✨ *ALLURA HEALTHCARE - AI WEB ASSISTANT TRANSFER (ALLEEN)* ✨\n\n` +
        `Hello Allura team, I am Alleen, your Virtual Assistant. I have completed the initial orientation with a patient:\n\n` +
        `👤 *Name:* ${nombre}\n` +
        `🌍 *Origin:* ${origen}\n` +
        `🗣️ *Language:* English\n` +
        `🎯 *Interested in:* ${servicio}\n` +
        `📅 *Estimated Travel Date:* ${fecha}\n\n` +
        `📝 *Conversation Summary:* ${resumen}\n\n` +
        `👉 *Request:* Patient is ready to speak with a human Patient Care Advisor.`
    : `✨ *ALLURA HEALTHCARE - TRANSFERENCIA ASISTENTE WEB IA (ALLEEN)* ✨\n\n` +
        `Hola equipo Allura, soy Alleen, su Asistente Virtual. He completado la orientación inicial de un paciente:\n\n` +
        `👤 *Nombre:* ${nombre}\n` +
        `🌍 *Origen:* ${origen}\n` +
        `🗣️ *Idioma:* Español\n` +
        `🎯 *Servicio de Interés:* ${servicio}\n` +
        `📅 *Fecha de Viaje:* ${fecha}\n\n` +
        `📝 *Resumen de la Charla:* ${resumen}\n\n` +
        `👉 *Solicitud:* El paciente desea continuar el proceso con un asesor humano.`;
}

export function AlluraVoiceWidget() {
  const [scriptReady, setScriptReady] = useState(false);
  const [pendingWhatsAppLink, setPendingWhatsAppLink] = useState<string | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  useEffect(() => {
    if (!agentId || !whatsappNumber) return;

    function handleWhatsAppHandoff(args: TransferToWhatsAppArgs) {
      let message: string;
      try {
        message = buildWhatsAppMessage(args ?? {});
      } catch {
        message = "Hola, vengo del asistente virtual Alleen y quisiera continuar la conversación con un asesor humano.";
      }
      const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      const opened = window.open(link, "_blank", "noopener,noreferrer");

      // Si el navegador bloquea la ventana emergente, window.open devuelve
      // null/undefined. Guardamos el link para ofrecer un boton de respaldo
      // visible junto al widget, en vez de dejar al paciente sin salida.
      if (!opened || opened.closed) {
        setPendingWhatsAppLink(link);
      }
    }

    // El widget de ElevenLabs registra las client tools escuchando su propio
    // evento "elevenlabs-convai:call" en el elemento <elevenlabs-convai>, e
    // inyectando la configuracion via event.detail.config.clientTools.
    // El nombre de la funcion debe coincidir EXACTO (case-sensitive) con el
    // nombre de la herramienta que el AGENTE invoca en runtime. Confirmado
    // por el propio SDK (mensaje de error "Client tool with name X is not
    // defined on client"): el nombre real es "transferToWhatsApp".
    function onCall(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail?.config) return;
      detail.config.clientTools = {
        ...detail.config.clientTools,
        transferToWhatsApp: (args: TransferToWhatsAppArgs) => {
          handleWhatsAppHandoff(args);
          return "Transferencia a WhatsApp iniciada.";
        },
      };
    }

    const el = elementRef.current;
    el?.addEventListener("elevenlabs-convai:call", onCall);

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      setScriptReady(true);
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => setScriptReady(true);
      document.body.appendChild(script);
    }

    return () => {
      el?.removeEventListener("elevenlabs-convai:call", onCall);
    };
  }, [agentId, whatsappNumber]);

  if (!agentId || !whatsappNumber) return null;

  return (
    <>
      {/* Boton de respaldo con posicion propia (fixed), independiente del
          widget de ElevenLabs: ese widget se auto-posiciona internamente y
          no respeta layouts flex del contenedor padre, asi que no podemos
          apilarlos con flex-col — quedaria tapado. Se ubica mas arriba en
          la pantalla para no solaparse con la burbuja del widget. */}
      {pendingWhatsAppLink && (
        <a
          href={pendingWhatsAppLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setPendingWhatsAppLink(null)}
          className="fixed bottom-28 right-6 z-50 flex items-center gap-2 rounded-full border border-[#8b9fb3] bg-white px-4 py-2 text-sm font-medium text-[#051c33] shadow-lg transition-colors hover:bg-[#051c33] hover:text-white"
        >
          Abrir WhatsApp
        </a>
      )}

      <elevenlabs-convai
        ref={elementRef as React.RefObject<HTMLElement>}
        agent-id={agentId}
        avatar-image-url="/images/alleen-avatar.png"
        avatar-orb-color-1="#051c33"
        avatar-orb-color-2="#8b9fb3"
        style={
          {
            display: scriptReady ? undefined : "none",
            "--elevenlabs-convai-primary-color": "#051c33",
            "--elevenlabs-convai-accent-color": "#8b9fb3",
            "--elevenlabs-convai-bg-color": "#FFFFFF",
            "--elevenlabs-convai-text-color": "#4B4F54",
          } as React.CSSProperties
        }
      />
    </>
  );
}

export default AlluraVoiceWidget;
