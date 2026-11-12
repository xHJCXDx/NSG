// Test helper: runs the JavaScript of an n8n Function node from workflow.json
// in isolation, with a minimal $input stub. It does not start n8n.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKFLOW_PATH = fileURLToPath(new URL('../../workflow.json', import.meta.url));

export function loadWorkflow() {
  return JSON.parse(readFileSync(WORKFLOW_PATH, 'utf8'));
}

export function getNodeCode(name) {
  const node = loadWorkflow().nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found in workflow.json: ${name}`);
  const code = node.parameters.functionCode ?? node.parameters.jsCode;
  if (typeof code !== 'string') throw new Error(`Node has no code: ${name}`);
  return code;
}

const toInput = (objects) => {
  const wrapped = objects.map((json) => ({ json }));
  return { all: () => wrapped, first: () => wrapped[0], item: wrapped[0] };
};

// inputItems: array of plain objects; each one becomes { json: obj }.
// otherNodes: { 'Node Name': [objects] } answers $('Node Name') references.
export function runNode(name, inputItems, otherNodes = {}) {
  const $ = (refName) => {
    if (!(refName in otherNodes)) throw new Error(`No stub for $('${refName}')`);
    return toInput(otherNodes[refName]);
  };
  const fn = new Function('$input', '$', getNodeCode(name));
  return fn(toInput(inputItems), $);
}
