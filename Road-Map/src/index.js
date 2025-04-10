import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import BusStop from './BusStop/BusStop';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BusStop />
  </React.StrictMode>
);

reportWebVitals();
