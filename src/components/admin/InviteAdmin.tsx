import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Mail, Plus } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

export default function InviteAdmin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) {
      showToast("Please enter an email address", "error");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

      if (error) {
        showToast("Error: " + error.message, "error");
        return;
      }
      
      showToast("Invitation sent to " + email, "success");
      setEmail("");
    } catch (err) {
      showToast("Failed to send invitation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-amazon-teal" />
          Invite New Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="Enter admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button 
          onClick={handleInvite} 
          disabled={isLoading}
          className="w-full bg-amazon-teal hover:bg-amazon-teal/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isLoading ? "Sending..." : "Send Invite"}
        </Button>
      </CardContent>
    </Card>
  );
}