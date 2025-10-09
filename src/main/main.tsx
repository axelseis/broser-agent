import { createRoot } from 'react-dom/client';
import { Main } from '@/components/Main';
import '../style/style.css';
import '../style/chat.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<Main />);
