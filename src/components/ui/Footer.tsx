import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          &copy; {new Date().getFullYear()} Divine Tech. All rights reserved.
        </p>
        <p>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Documentation
          </a>
        </p>
      </div>
    </footer>
  );
}
