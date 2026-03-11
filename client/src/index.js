import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Basic security headers can be set via server or meta tags in public/index.html
// Here we ensure no unsafe eval or inline scripts are used in code

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
