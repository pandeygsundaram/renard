import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Settings as SettingsIcon, Users, Plus, X, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("team");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);

  const API_URL = import.meta.env.VITE_SERVER;

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTeams(response.data.teams || []);
      if (response.data.teams && response.data.teams.length > 0) {
        setSelectedTeam(response.data.teams[0]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !selectedTeam) return;

    try {
      setInviting(true);
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_URL}/teams/${selectedTeam.id}/members`,
        {
          userEmail: inviteEmail,
          role: inviteRole,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      fetchTeams(); // Refresh teams
    } catch (error: any) {
      console.error("Error inviting member:", error);
      alert(error.response?.data?.error || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !confirm("Are you sure you want to remove this member?"))
      return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/teams/${selectedTeam.id}/members/${memberId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchTeams(); // Refresh teams
    } catch (error: any) {
      console.error("Error removing member:", error);
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your teams and account settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("team")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "team"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Team Management
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "account"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Account
          </button>
        </div>
      </div>

      {/* Team Management Tab */}
      {activeTab === "team" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No teams yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create a team to collaborate with others
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Selector */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-3">
                    Your Teams
                  </h3>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedTeam?.id === team.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team Details */}
              <div className="lg:col-span-2">
                {selectedTeam && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {selectedTeam.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTeam.description || "No description"}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow hover:bg-primary/90 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                      </button>
                    </div>

                    {/* Members List */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">
                        Members ({selectedTeam.members?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {selectedTeam.members?.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                {member.user.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {member.user.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                                {member.role}
                              </span>
                              {member.role !== "OWNER" && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  title="Remove member"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Account Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={
                    JSON.parse(localStorage.getItem("user") || "{}")?.email || ""
                  }
                  className="mt-1 w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    JSON.parse(localStorage.getItem("user") || "{}")?.name || ""
                  }
                  className="mt-1 w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="mt-1 w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={inviting || !inviteEmail}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
