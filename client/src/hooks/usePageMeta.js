import { useEffect } from 'react';

/**
 * Custom hook to set document title and meta description dynamically
 * @param {string} title Page title
 * @param {string} description Meta description for SEO
 */
export const usePageMeta = (title, description) => {
  useEffect(() => {
    if (title) {
      document.title = title.includes('FlowForge') ? title : `${title} | FlowForge`;
    }
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);
};

export default usePageMeta;
