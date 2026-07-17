import awsLogo from "@lobehub/icons-static-svg/icons/aws.svg";
import cohereLogo from "@lobehub/icons-static-svg/icons/cohere.svg";
import llamaIndexLogo from "@lobehub/icons-static-svg/icons/llamaindex.svg";
import mistralLogo from "@lobehub/icons-static-svg/icons/mistral.svg";
import openAiLogo from "@lobehub/icons-static-svg/icons/openai.svg";
import {
  SiAngular,
  SiAnthropic,
  SiC,
  SiCplusplus,
  SiCrewai,
  SiCss,
  SiDart,
  SiDjango,
  SiDocker,
  SiDotnet,
  SiExpress,
  SiFastapi,
  SiFirebase,
  SiFlask,
  SiGo,
  SiGooglegemini,
  SiHtml5,
  SiHuggingface,
  SiJavascript,
  SiKotlin,
  SiLangchain,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiOllama,
  SiOpenjdk,
  SiPhp,
  SiPostgresql,
  SiPython,
  SiPytorch,
  SiReact,
  SiRedis,
  SiRuby,
  SiRust,
  SiSolidity,
  SiStreamlit,
  SiSupabase,
  SiSvelte,
  SiSwift,
  SiTailwindcss,
  SiTensorflow,
  SiTypescript,
  SiVercel,
  SiVuedotjs,
} from "@icons-pack/react-simple-icons";
import { Code2, Database } from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icon";
type TechnologyIconComponent = React.ComponentType<{
  "aria-hidden"?: React.AriaAttributes["aria-hidden"];
  className?: string;
  color?: string;
}>;

const TECHNOLOGY_ICONS: Record<string, TechnologyIconComponent> = {
  C: SiC,
  "C++": SiCplusplus,
  "C#": SiDotnet,
  CSS: SiCss,
  Dart: SiDart,
  Go: SiGo,
  HTML: SiHtml5,
  Java: SiOpenjdk,
  JavaScript: SiJavascript,
  Kotlin: SiKotlin,
  PHP: SiPhp,
  Python: SiPython,
  Ruby: SiRuby,
  Rust: SiRust,
  Solidity: SiSolidity,
  Swift: SiSwift,
  TypeScript: SiTypescript,
  Angular: SiAngular,
  Anthropic: SiAnthropic,
  CrewAI: SiCrewai,
  Django: SiDjango,
  Docker: SiDocker,
  Express: SiExpress,
  FastAPI: SiFastapi,
  Firebase: SiFirebase,
  Flask: SiFlask,
  "Google Gemini": SiGooglegemini,
  "Hugging Face": SiHuggingface,
  LangChain: SiLangchain,
  MongoDB: SiMongodb,
  "Next.js": SiNextdotjs,
  "Node.js": SiNodedotjs,
  Ollama: SiOllama,
  PostgreSQL: SiPostgresql,
  PyTorch: SiPytorch,
  React: SiReact,
  Redis: SiRedis,
  Streamlit: SiStreamlit,
  Supabase: SiSupabase,
  Svelte: SiSvelte,
  "Tailwind CSS": SiTailwindcss,
  TensorFlow: SiTensorflow,
  Vercel: SiVercel,
  "Vercel AI SDK": SiVercel,
  Vue: SiVuedotjs,
};

const STATIC_TECHNOLOGY_ICONS = {
  AWS: awsLogo,
  Cohere: cohereLogo,
  LlamaIndex: llamaIndexLogo,
  "Mistral AI": mistralLogo,
  OpenAI: openAiLogo,
} satisfies Record<string, string | { src: string }>;

export function TechnologyIcon({ name, className }: { name: string; className?: string }) {
  if (name === "SQL") {
    return <Database aria-hidden="true" className={className} />;
  }

  const staticIcon = STATIC_TECHNOLOGY_ICONS[name as keyof typeof STATIC_TECHNOLOGY_ICONS];
  if (staticIcon) {
    return <BrandIcon src={staticIcon} className={className} />;
  }

  const Icon = TECHNOLOGY_ICONS[name] ?? Code2;
  return (
    <Icon
      aria-hidden="true"
      className={["shrink-0", className].filter(Boolean).join(" ")}
      color="currentColor"
    />
  );
}
