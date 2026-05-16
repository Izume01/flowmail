'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  OnConnect,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { TriggerNode, SendEmailNode, WaitNode, ConditionNode } from './CustomNodes';

const nodeTypes = {
  trigger: TriggerNode,
  email: SendEmailNode,
  wait: WaitNode,
  condition: ConditionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'User Signed Up' },
    position: { x: 250, y: 5 },
  },
];

const initialEdges: Edge[] = [];

export default function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      data: { label: `New ${type}` },
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onSave = async () => {
    const graph = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }, // Simple viewport for now
    };
    console.log('Saving graph:', graph);
    // TODO: Implement actual save to Supabase
    alert('Graph saved to console (check dev tools)');
  };

  return (
    <div className="w-full h-[80vh] border border-gray-200 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        
        <Panel position="top-right" className="bg-white p-4 shadow-md rounded-md flex flex-col gap-2">
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Actions</div>
          <button
            onClick={() => addNode('trigger')}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
          >
            + Trigger
          </button>
          <button
            onClick={() => addNode('email')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition"
          >
            + Email
          </button>
          <button
            onClick={() => addNode('wait')}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition"
          >
            + Wait
          </button>
          <button
            onClick={() => addNode('condition')}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition"
          >
            + Condition
          </button>
          <hr className="my-2" />
          <button
            onClick={onSave}
            className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 transition"
          >
            Save Flow
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
