import { normalizeString, isNameMatch, STAGE_ALIASES } from './src/lib/stageChecklistStatus';

console.log('--- Testando Lógica de Match de Etapa ---');

const colName = 'Documentação enviada';
const clName = 'Cadastro iniciado';

console.log(`Coluna: "${colName}"`);
console.log(`Checklist: "${clName}"`);
console.log(`Normalized Col: "${normalizeString(colName)}"`);
console.log(`Normalized CL: "${normalizeString(clName)}"`);
console.log(`Match? ${isNameMatch(clName, colName)}`);

console.log('\nAliases para "' + normalizeString(colName) + '":', STAGE_ALIASES[normalizeString(colName)]);

