import { configure } from "@testing-library/react-native";

// As suítes rodam em paralelo e a máquina fica lenta: 1s padrão do findBy*
// vira intermitência. 5s continua falhando rápido quando algo está errado.
configure({ asyncUtilTimeout: 5000 });

// O primeiro teste de cada arquivo paga o require do React Native/Expo com
// o cache do Jest frio (dezenas de segundos); o limite padrão de 5s não cobre.
jest.setTimeout(60000);
