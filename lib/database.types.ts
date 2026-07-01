export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username?: string;
          avatar_color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          player1_id: string;
          player2_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          player1_id: string;
          player2_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          player1_id?: string;
          player2_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          invited_user_id: string;
          status: "pending" | "accepted" | "declined";
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          invited_user_id: string;
          status?: "pending" | "accepted" | "declined";
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          invited_user_id?: string;
          status?: "pending" | "accepted" | "declined";
          created_at?: string;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          date: string;
          mode: "ko" | "gruppenphase";
          status: "draft" | "group_stage" | "ko_stage" | "finished";
          organizer_id: string;
          teams_per_group_advance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          mode: "ko" | "gruppenphase";
          status?: "draft" | "group_stage" | "ko_stage" | "finished";
          organizer_id: string;
          teams_per_group_advance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          mode?: "ko" | "gruppenphase";
          status?: "draft" | "group_stage" | "ko_stage" | "finished";
          organizer_id?: string;
          teams_per_group_advance?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tournament_teams: {
        Row: {
          tournament_id: string;
          team_id: string;
          group_name: string | null;
        };
        Insert: {
          tournament_id: string;
          team_id: string;
          group_name?: string | null;
        };
        Update: {
          tournament_id?: string;
          team_id?: string;
          group_name?: string | null;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          stage: "group" | "ko";
          round: number;
          match_order: number;
          group_name: string | null;
          team_a_id: string | null;
          team_b_id: string | null;
          score_a: number | null;
          score_b: number | null;
          winner_id: string | null;
          status: "pending" | "ready" | "done";
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          stage: "group" | "ko";
          round: number;
          match_order: number;
          group_name?: string | null;
          team_a_id?: string | null;
          team_b_id?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          winner_id?: string | null;
          status?: "pending" | "ready" | "done";
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          stage?: "group" | "ko";
          round?: number;
          match_order?: number;
          group_name?: string | null;
          team_a_id?: string | null;
          team_b_id?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          winner_id?: string | null;
          status?: "pending" | "ready" | "done";
          created_at?: string;
        };
        Relationships: [];
      };
      // Read-only SQL views — als Tables modelliert, damit .from() sie ohne
      // Sonderfall auflöst (Row = Update = Insert, da nie beschrieben).
      team_match_stats: {
        Row: {
          tournament_id: string;
          stage: "group" | "ko";
          team_id: string;
          played: number;
          wins: number;
          losses: number;
          cups_for: number;
          cups_against: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      team_overall_stats: {
        Row: {
          team_id: string;
          played: number;
          wins: number;
          losses: number;
          cups_for: number;
          cups_against: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_team_invite: {
        Args: { p_invite_id: string };
        Returns: undefined;
      };
      decline_team_invite: {
        Args: { p_invite_id: string };
        Returns: undefined;
      };
      disband_team: {
        Args: { p_team_id: string };
        Returns: undefined;
      };
      submit_match_result: {
        Args: { p_match_id: string; p_score_a: number; p_score_b: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInvite = Database["public"]["Tables"]["team_invites"]["Row"];
export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentTeam = Database["public"]["Tables"]["tournament_teams"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type TeamMatchStats = Database["public"]["Tables"]["team_match_stats"]["Row"];
export type TeamOverallStats = Database["public"]["Tables"]["team_overall_stats"]["Row"];

export type TournamentMode = Tournament["mode"];
export type TournamentStatus = Tournament["status"];
export type MatchStage = Match["stage"];
export type MatchStatus = Match["status"];
export type InviteStatus = TeamInvite["status"];
