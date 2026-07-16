import {createRoot} from 'react-dom/client';
import {ManagerApp} from '@/app/manager/App';
import '@/styles/auth.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(<ManagerApp />);
