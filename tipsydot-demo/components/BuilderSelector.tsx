"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Code, Layers } from "lucide-react";

interface Builder {
  id: number;
  name: string;
  project: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const builders: Builder[] = [
  {
    id: 0,
    name: "Alice - Moonbeam",
    project: "EVM Smart Contracts for Polkadot",
    description: "Building seamless Ethereum compatibility on Polkadot",
    icon: <Code className="h-5 w-5" />,
    color: "bg-blue-500",
  },
  {
    id: 1,
    name: "Bob - Astar",
    project: "WASM & EVM Multi-VM Platform",
    description: "Enabling both WASM and EVM smart contracts",
    icon: <Layers className="h-5 w-5" />,
    color: "bg-purple-500",
  },
  {
    id: 2,
    name: "Charlie - Acala",
    project: "DeFi Hub of Polkadot",
    description: "Building decentralized finance infrastructure",
    icon: <User className="h-5 w-5" />,
    color: "bg-green-500",
  },
];

interface BuilderSelectorProps {
  selectedBuilder: number;
  onSelectBuilder: (builderId: number) => void;
}

export default function BuilderSelector({
  selectedBuilder,
  onSelectBuilder,
}: BuilderSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select a Builder to Support</h3>
      <RadioGroup
        value={selectedBuilder.toString()}
        onValueChange={(value) => onSelectBuilder(Number(value))}
      >
        {builders.map((builder) => (
          <Card
            key={builder.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedBuilder === builder.id ? "ring-2 ring-red-500" : ""
            }`}
            onClick={() => onSelectBuilder(builder.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${builder.color} text-white`}>
                    {builder.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <RadioGroupItem value={builder.id.toString()} />
                      {builder.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {builder.project}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="ml-2">
                  Underfunded
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {builder.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
}
