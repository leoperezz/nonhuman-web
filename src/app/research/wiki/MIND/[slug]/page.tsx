'use client'
import { useParams } from 'next/navigation'
import { useLanguage } from '@/app/context/LanguageContext'
import { useTheme } from '@/app/context/ThemeContext'
import { useEffect, useState } from 'react'
import MarkdownRenderer from '@/app/research/components/MarkdownRenderer'
import SidebarWiki from '@/app/research/components/SidebarWiki'
import '../style.css'

interface ContentMetadata {
  title: string;
  description: string;
  authors: string;
  date: string;
  url: string;
}

interface ContentData {
  es: ContentMetadata;
  en: ContentMetadata;
}

const slugify = (str: string) => {
  // Normalización y transformación del string
  const normalized = str
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÁÀÄÂÃ]/g, 'a')
    .replace(/[ÉÈËÊ]/g, 'e')
    .replace(/[ÍÌÏÎ]/g, 'i')
    .replace(/[ÓÒÖÔÕ]/g, 'o')
    .replace(/[ÚÙÜÛ]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'n');

  return normalized
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-')     // Espacios a guiones
    .replace(/-+/g, '-')      // Eliminar guiones múltiples
    .replace(/^-+/, '')       // Eliminar guiones del inicio
    .replace(/-+$/, '');      // Eliminar guiones del final
};

export default function MINDContentPage() {
  const params = useParams();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const slug = params.slug as string;
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Obtenemos los metadatos del JSON
        const metadataResponse = await fetch(`/wiki/MIND/${slug}.json`);
        const contentData: ContentData = await metadataResponse.json();
        const currentMetadata = contentData[language as keyof ContentData];
        setMetadata(currentMetadata);

        // Cargamos el contenido markdown según la URL del metadata
        const contentUrl = currentMetadata.url.startsWith('http')
          ? currentMetadata.url
          : `/${currentMetadata.url}`;
        const contentResponse = await fetch(contentUrl);
        const text = await contentResponse.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading content:', error);
        setContent(language === 'en'
          ? '# Error\nContent not found or error loading the page.'
          : '# Error\nContenido no encontrado o error al cargar la página.');
      }
    };

    fetchContent();
  }, [slug, language]);

  return (
    <div className={`wiki-layout ${theme}`}>
      <div className="content-container">
        {metadata && (
          <div className="content-metadata">
            <h1>{metadata.title}</h1>
            <p className="metadata-description">{metadata.description}</p>
            <div className="metadata-info">
              <span>{metadata.authors}</span>
              <span>{metadata.date}</span>
            </div>
          </div>
        )}
        <MarkdownRenderer 
          content={content}
          options={{ slugify }}
        />
      </div>
      {/* Renderizamos el sidebar solo en desktop */}
      {!isMobile && (
        <SidebarWiki 
          content={content}
          slugify={slugify}
        />
      )}
    </div>
  );
}
