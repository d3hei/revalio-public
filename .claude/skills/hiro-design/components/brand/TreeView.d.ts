import React from 'react';

export interface TreeNode {
  label: string;
  comment?: string;
  /** Tint the label violet. */
  accent?: boolean;
  children?: TreeNode[];
  onClick?: () => void;
}

export interface TreeViewProps {
  /** Path shown after "$ tree". @default "." */
  root?: string;
  nodes: TreeNode[];
  onSelect?: (node: TreeNode) => void;
}

/** ASCII file-tree motif for laying out a product/feature map. */
export function TreeView(props: TreeViewProps): JSX.Element;
