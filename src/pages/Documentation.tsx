import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const Documentation = () => {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch('/README.md')
      .then((res) => res.text())
      .then((text) => setContent(text))
      .catch((err) => setContent('Failed to load documentation.'));
  }, []);

  return (
    <div className="container mx-auto p-4 prose dark:prose-invert max-w-none text-lg">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default Documentation;
