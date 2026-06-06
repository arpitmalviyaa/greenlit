"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Send, ChevronDown, ChevronUp, Zap, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DealRoom {
  id: string;
  title: string;
  status: "active" | "closed" | "archived";
  creator_id: string;
  jurisdiction: string;
  created_at: string;
}

interface DealMessage {
  id: string;
  deal_room_id: string;
  sender_id: string;
  message_type: "text" | "term_proposal" | "counter_proposal" | "acceptance" | "rejection";
  content: string;
  term_json: Record<string, unknown> | null;
  ai_analysis_json: Record<string, unknown> | null;
  created_at: string;
}

interface TermAnalysis {
  assessment: string;
  risk: "high" | "medium" | "low";
  counter_suggestions: string[];
  red_flags: string[];
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
  archived: "bg-yellow-100 text-yellow-800",
};

const MSG_STYLES: Record<string, string> = {
  text: "bg-white border border-gray-200",
  term_proposal: "bg-blue-50 border border-blue-200",
  counter_proposal: "bg-purple-50 border border-purple-200",
  acceptance: "bg-green-50 border border-green-300",
  rejection: "bg-red-50 border border-red-300",
};

export default function DealsPage() {
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<DealRoom | null>(null);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Create room form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCreatorId, setNewCreatorId] = useState("");
  const [newSowId, setNewSowId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newJurisdiction, setNewJurisdiction] = useState("IN");
  const [creating, setCreating] = useState(false);

  // Message input
  const [msgMode, setMsgMode] = useState<"text" | "term">("text");
  const [msgText, setMsgText] = useState("");
  const [termKey, setTermKey] = useState("");
  const [termValue, setTermValue] = useState("");
  const [sending, setSending] = useState(false);

  // Counter proposal
  const [counterLoading, setCounterLoading] = useState<string | null>(null);
  const [counterResults, setCounterResults] = useState<Record<string, unknown>>({});

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    const res = await fetch("/api/deals/rooms");
    const json = await res.json() as { rooms?: DealRoom[] };
    setRooms(json.rooms ?? []);
    setLoadingRooms(false);
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    setLoadingMsgs(true);
    const res = await fetch(`/api/deals/${roomId}/messages`);
    const json = await res.json() as { messages?: DealMessage[] };
    setMessages(json.messages ?? []);
    setLoadingMsgs(false);
  }, []);

  useEffect(() => { void fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    if (selectedRoom) void fetchMessages(selectedRoom.id);
  }, [selectedRoom, fetchMessages]);

  const createRoom = async () => {
    if (!newCreatorId || !newTitle) return;
    setCreating(true);
    const res = await fetch("/api/deals/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: newCreatorId, sow_id: newSowId || undefined, title: newTitle, jurisdiction: newJurisdiction }),
    });
    if (res.ok) {
      setShowCreateModal(false);
      setNewCreatorId(""); setNewSowId(""); setNewTitle("");
      await fetchRooms();
    }
    setCreating(false);
  };

  const sendMessage = async () => {
    if (!selectedRoom || (!msgText && msgMode === "text")) return;
    setSending(true);
    const body = msgMode === "text"
      ? { message_type: "text", content: msgText }
      : { message_type: "term_proposal", content: `Term: ${termKey} = ${termValue}`, term_json: { [termKey]: termValue } };

    await fetch(`/api/deals/${selectedRoom.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsgText(""); setTermKey(""); setTermValue("");
    await fetchMessages(selectedRoom.id);
    setSending(false);
  };

  const suggestCounter = async (msg: DealMessage) => {
    if (!selectedRoom || !msg.term_json) return;
    setCounterLoading(msg.id);
    const res = await fetch("/api/deals/suggest-counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_room_id: selectedRoom.id, original_term: msg.term_json, jurisdiction: selectedRoom.jurisdiction }),
    });
    const json = await res.json() as Record<string, unknown>;
    setCounterResults((prev) => ({ ...prev, [msg.id]: json }));
    await fetchMessages(selectedRoom.id);
    setCounterLoading(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full min-h-screen bg-gray-50">
      {/* Left: Room List */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Deal Rooms</h1>
          <Button size="sm" onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-1" />New</Button>
        </div>

        {showCreateModal && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Create Deal Room</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Creator ID</Label><Input value={newCreatorId} onChange={e => setNewCreatorId(e.target.value)} placeholder="uuid" /></div>
              <div><Label>SOW ID (optional)</Label><Input value={newSowId} onChange={e => setNewSowId(e.target.value)} placeholder="uuid" /></div>
              <div><Label>Title</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Campaign deal" /></div>
              <div><Label>Jurisdiction</Label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={newJurisdiction} onChange={e => setNewJurisdiction(e.target.value)}>
                  <option value="IN">India</option><option value="US">USA</option><option value="UK">UK</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void createRoom()} disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loadingRooms ? (
          <p className="text-sm text-gray-500">Loading rooms…</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-500">No deal rooms yet.</p>
        ) : (
          <div className="space-y-2">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedRoom?.id === room.id ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-blue-200"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{room.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[room.status]}`}>{room.status}</span>
                </div>
                <div className="text-xs text-gray-500">{room.jurisdiction} · {new Date(room.created_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Messages */}
      <div className="flex-1 flex flex-col">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Select a deal room</p></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{selectedRoom.title}</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOURS[selectedRoom.status]}`}>{selectedRoom.status}</span>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[50vh]">
              {loadingMsgs ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400">No messages yet.</p>
              ) : messages.map(msg => (
                <MessageCard
                  key={msg.id}
                  msg={msg}
                  onSuggestCounter={() => void suggestCounter(msg)}
                  counterLoading={counterLoading === msg.id}
                  counterResult={counterResults[msg.id] as Record<string, unknown> | undefined}
                />
              ))}
            </div>

            {/* Input */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setMsgMode("text")} className={`px-3 py-1 rounded text-xs font-medium ${msgMode === "text" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>Text</button>
                  <button onClick={() => setMsgMode("term")} className={`px-3 py-1 rounded text-xs font-medium ${msgMode === "term" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>Term Proposal</button>
                </div>
                {msgMode === "text" ? (
                  <div className="flex gap-2">
                    <Input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type a message…" onKeyDown={e => e.key === "Enter" && void sendMessage()} />
                    <Button size="sm" onClick={() => void sendMessage()} disabled={sending}><Send className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={termKey} onChange={e => setTermKey(e.target.value)} placeholder="Term (e.g. fee_amount)" />
                      <Input value={termValue} onChange={e => setTermValue(e.target.value)} placeholder="Value (e.g. 50000)" />
                    </div>
                    <Button size="sm" onClick={() => void sendMessage()} disabled={sending || !termKey || !termValue}>
                      <Send className="w-4 h-4 mr-1" />{sending ? "Sending…" : "Propose Term"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function MessageCard({
  msg,
  onSuggestCounter,
  counterLoading,
  counterResult,
}: {
  msg: DealMessage;
  onSuggestCounter: () => void;
  counterLoading: boolean;
  counterResult?: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const analysis = msg.ai_analysis_json as TermAnalysis | null;

  return (
    <div className={`rounded-lg p-3 ${MSG_STYLES[msg.message_type]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{msg.message_type.replace("_", " ")}</span>
        <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
      </div>
      <p className="text-sm text-gray-800 mb-2">{msg.content}</p>

      {msg.message_type === "acceptance" && <CheckCircle className="w-5 h-5 text-green-600" />}
      {msg.message_type === "rejection" && <XCircle className="w-5 h-5 text-red-600" />}

      {analysis && (
        <div className="mt-2 border-t pt-2 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-medium">AI Pre-screen: </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${analysis.risk === "high" ? "bg-red-100 text-red-700" : analysis.risk === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{analysis.risk} risk</span>
          </div>
          <p className="text-xs text-gray-600">{analysis.assessment}</p>
          {analysis.red_flags?.length > 0 && (
            <div>
              <button className="text-xs text-red-600 flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {analysis.red_flags.length} red flag(s)
              </button>
              {expanded && <ul className="mt-1 pl-3 space-y-0.5">{analysis.red_flags.map((f, i) => <li key={i} className="text-xs text-red-600">• {f}</li>)}</ul>}
            </div>
          )}
        </div>
      )}

      {msg.message_type === "term_proposal" && (
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={onSuggestCounter} disabled={counterLoading} className="text-xs h-7">
            {counterLoading ? "Generating…" : "Suggest Counter"}
          </Button>
        </div>
      )}

      {counterResult && (
        <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-2 text-xs">
          <p className="font-medium text-purple-800 mb-1">Counter Proposal</p>
          <p className="text-gray-700">{String(counterResult.reasoning ?? "")}</p>
          {counterResult.negotiation_notes != null && <p className="mt-1 text-gray-500 italic">{String(counterResult.negotiation_notes)}</p>}
        </div>
      )}
    </div>
  );
}
