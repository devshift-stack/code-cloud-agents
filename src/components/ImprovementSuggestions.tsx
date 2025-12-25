import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Lightbulb, ArrowRight, TrendingUp, Shield, Zap, Code } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface Suggestion {
  id: string;
  category: 'performance' | 'security' | 'code_quality' | 'automation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  source: string;
  suggestedBy: string;
}

const mockSuggestions: Suggestion[] = [
  {
    id: '1',
    category: 'performance',
    title: 'Lazy Loading für Agent Cards',
    description: 'Agent Cards erst laden wenn sie im Viewport sichtbar sind',
    impact: 'high',
    effort: 'low',
    source: 'code-cloud-agents',
    suggestedBy: 'Engineering Lead',
  },
  {
    id: '2',
    category: 'security',
    title: 'API Rate Limiting implementieren',
    description: 'Schutz vor API Abuse durch Request-Limits pro User/Agent',
    impact: 'high',
    effort: 'medium',
    source: 'mcp-servers',
    suggestedBy: 'Monitoring Agent',
  },
  {
    id: '3',
    category: 'code_quality',
    title: 'TypeScript Strict Mode aktivieren',
    description: 'Strict Mode für bessere Typsicherheit im gesamten Projekt',
    impact: 'medium',
    effort: 'high',
    source: 'code-cloud-agents',
    suggestedBy: 'Research Agent',
  },
  {
    id: '4',
    category: 'automation',
    title: 'Auto-Deployment Pipeline',
    description: 'GitHub Actions für automatisches Deployment bei Merge',
    impact: 'high',
    effort: 'medium',
    source: 'infrastructure',
    suggestedBy: 'Deployment Agent',
  },
  {
    id: '5',
    category: 'performance',
    title: 'Memory Server Caching',
    description: 'Redis Cache vor Pinecone für häufige Queries',
    impact: 'medium',
    effort: 'medium',
    source: 'mcp-servers',
    suggestedBy: 'Memory Server',
  },
  {
    id: '6',
    category: 'security',
    title: 'Shadow Level Audit Logging',
    description: 'Alle Shadow-Level Zugriffe in separatem Log tracken',
    impact: 'high',
    effort: 'low',
    source: 'memory-server',
    suggestedBy: 'Meta Supervisor',
  },
  {
    id: '7',
    category: 'automation',
    title: 'Automatische STOP Score Alerts',
    description: 'Slack-Benachrichtigung wenn STOP Score > 50',
    impact: 'medium',
    effort: 'low',
    source: 'code-cloud-agents',
    suggestedBy: 'Monitoring Agent',
  },
  {
    id: '8',
    category: 'code_quality',
    title: 'Unit Test Coverage > 80%',
    description: 'Test Coverage für alle MCP Server erhöhen',
    impact: 'medium',
    effort: 'high',
    source: 'mcp-servers',
    suggestedBy: 'Engineering Lead',
  },
];

const categoryIcons = {
  performance: <Zap className="w-4 h-4 text-yellow-500" />,
  security: <Shield className="w-4 h-4 text-red-500" />,
  code_quality: <Code className="w-4 h-4 text-blue-500" />,
  automation: <TrendingUp className="w-4 h-4 text-green-500" />,
};

const categoryLabels = {
  performance: 'Performance',
  security: 'Security',
  code_quality: 'Code Quality',
  automation: 'Automation',
};

const impactColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const effortColors = {
  high: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function ImprovementSuggestions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Verbesserungsvorschläge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Kategorie</TableHead>
                <TableHead>Vorschlag</TableHead>
                <TableHead className="w-[100px]">Impact</TableHead>
                <TableHead className="w-[100px]">Aufwand</TableHead>
                <TableHead className="w-[120px]">Repository</TableHead>
                <TableHead className="w-[140px]">Vorgeschlagen von</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSuggestions.map((suggestion) => (
                <TableRow key={suggestion.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {categoryIcons[suggestion.category]}
                      <span className="text-xs">{categoryLabels[suggestion.category]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={impactColors[suggestion.impact]}>
                      {suggestion.impact === 'high' ? 'Hoch' : suggestion.impact === 'medium' ? 'Mittel' : 'Niedrig'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={effortColors[suggestion.effort]}>
                      {suggestion.effort === 'high' ? 'Hoch' : suggestion.effort === 'medium' ? 'Mittel' : 'Niedrig'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{suggestion.source}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{suggestion.suggestedBy}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
