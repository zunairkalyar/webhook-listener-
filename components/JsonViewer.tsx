
import React from 'react';

interface JsonViewerProps {
  data: any;
  maxHeight?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, maxHeight = "400px" }) => {
  const formattedJson = JSON.stringify(data, null, 2);

  const syntaxHighlight = (json: string) => {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-green-400'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-red-400'; // key
        } else {
          cls = 'text-sky-300'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-400'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-slate-500'; // null
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  };

  if (!data) {
    return (
      <div 
        className="json-viewer bg-slate-800 p-4 rounded-md text-slate-400 text-sm"
        style={{ maxHeight: maxHeight, overflowY: 'auto' }}
      >
        No data to display.
      </div>
    );
  }

  return (
    <pre
      className="json-viewer bg-slate-950 p-4 rounded-md text-sm shadow-inner"
      style={{ maxHeight: maxHeight, overflowY: 'auto' }}
      dangerouslySetInnerHTML={{ __html: syntaxHighlight(formattedJson) }}
    />
  );
};
