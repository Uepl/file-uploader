import { createApp } from 'vue'
import "./style.css"
import App from './App.vue'
import router from './src/router';

const app = createApp(App);
app.use(router); // Use it
app.mount('#app');