// src/main.js
import './styles/tokens.css';
import './styles/base.css';
import './styles/components/header.css';
import './styles/components/kpi-strip.css';
import './styles/components/filters.css';
import './styles/components/alert-banner.css';
import './styles/components/table.css';
import './styles/components/modal.css';
import './styles/components/upload-panel.css';
import './styles/components/toast.css';
import './styles/components/empty-state.css';

import { createStore, INITIAL_STATE } from './app/store.js';
import { createController } from './app/controller.js';
import { mount } from './view/render.js';
import { exportFleetXLSX } from './export/xlsx.js';

const store = createStore(INITIAL_STATE);
const controller = createController(store);
mount(document.getElementById('app'), store, controller, exportFleetXLSX);
