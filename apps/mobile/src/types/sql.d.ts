// Migrations .sql viram string em tempo de build (babel-plugin-inline-import).
declare module "*.sql" {
  const content: string;
  export default content;
}
