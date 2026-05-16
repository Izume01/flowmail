import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

type NodeData = {
  label: string;
  description?: string;
};

export const TriggerNode = memo(({ data }: NodeProps<Node<NodeData>>) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500 w-48">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-500 mr-2">
          ⚡
        </div>
        <div className="ml-2">
          <div className="text-xs font-bold text-gray-500 uppercase">Trigger</div>
          <div className="text-sm font-semibold">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
});

export const SendEmailNode = memo(({ data }: NodeProps<Node<NodeData>>) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500 w-48">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-green-100 text-green-500 mr-2">
          ✉️
        </div>
        <div className="ml-2">
          <div className="text-xs font-bold text-gray-500 uppercase">Email</div>
          <div className="text-sm font-semibold">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  );
});

export const WaitNode = memo(({ data }: NodeProps<Node<NodeData>>) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-500 w-48">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-500 mr-2">
          ⏳
        </div>
        <div className="ml-2">
          <div className="text-xs font-bold text-gray-500 uppercase">Wait</div>
          <div className="text-sm font-semibold">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
    </div>
  );
});

export const ConditionNode = memo(({ data }: NodeProps<Node<NodeData>>) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-purple-500 w-48">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-500 mr-2">
          ❓
        </div>
        <div className="ml-2">
          <div className="text-xs font-bold text-gray-500 uppercase">Condition</div>
          <div className="text-sm font-semibold">{data.label}</div>
        </div>
      </div>
      <div className="flex justify-between mt-2">
        <div className="relative">
          <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-green-500 left-4" />
          <span className="text-[10px] text-green-600 font-bold ml-1">YES</span>
        </div>
        <div className="relative">
          <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-red-500 right-4" />
          <span className="text-[10px] text-red-600 font-bold mr-1">NO</span>
        </div>
      </div>
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
SendEmailNode.displayName = 'SendEmailNode';
WaitNode.displayName = 'WaitNode';
ConditionNode.displayName = 'ConditionNode';
