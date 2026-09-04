export type Role = "admin" | "lid";

export type TaskStatus = "open" | "afgevinkt";

export type ActiviteitType = "les" | "project" | "vrij_gebruik" | "extern_bezoek";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: Role;
        };
        Update: {
          full_name?: string | null;
          role?: Role;
        };
        Relationships: [];
      };
      order_batches: {
        Row: {
          id: string;
          besteld_op: string;
          besteld_door: string | null;
        };
        Insert: {
          besteld_door?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "order_batches_besteld_door_fkey";
            columns: ["besteld_door"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          item_naam: string;
          aantal: number;
          notitie: string | null;
          link: string | null;
          toegevoegd_door: string | null;
          order_batch_id: string | null;
          created_at: string;
        };
        Insert: {
          item_naam: string;
          aantal: number;
          notitie?: string | null;
          link?: string | null;
          toegevoegd_door?: string | null;
        };
        Update: {
          item_naam?: string;
          aantal?: number;
          notitie?: string | null;
          link?: string | null;
          order_batch_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_toegevoegd_door_fkey";
            columns: ["toegevoegd_door"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_batch_id_fkey";
            columns: ["order_batch_id"];
            isOneToOne: false;
            referencedRelation: "order_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          id: string;
          naam: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          naam: string;
          created_by?: string | null;
        };
        Update: {
          naam?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          naam: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          subject_id: string;
          naam: string;
          created_by?: string | null;
        };
        Update: {
          naam?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topics_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          subject_id: string;
          topic_id: string;
          titel: string;
          beschrijving: string | null;
          tags: string[];
          link: string | null;
          file_path: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          subject_id: string;
          topic_id: string;
          titel: string;
          beschrijving?: string | null;
          tags?: string[];
          link?: string | null;
          file_path?: string | null;
          created_by?: string | null;
        };
        Update: {
          subject_id?: string;
          topic_id?: string;
          titel?: string;
          beschrijving?: string | null;
          tags?: string[];
          link?: string | null;
          file_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materials_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          titel: string;
          beschrijving: string | null;
          datum: string;
          toegewezen_aan: string | null;
          status: TaskStatus;
          afgevinkt_op: string | null;
          deadline_op: string | null;
          gearchiveerd: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          titel: string;
          beschrijving?: string | null;
          datum: string;
          toegewezen_aan?: string | null;
          deadline_op?: string | null;
          created_by?: string | null;
        };
        Update: {
          titel?: string;
          beschrijving?: string | null;
          datum?: string;
          toegewezen_aan?: string | null;
          status?: TaskStatus;
          afgevinkt_op?: string | null;
          deadline_op?: string | null;
          gearchiveerd?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_toegewezen_aan_fkey";
            columns: ["toegewezen_aan"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      labs: {
        Row: {
          id: string;
          naam: string;
          volgorde: number;
          actief: boolean;
        };
        Insert: {
          naam: string;
          volgorde?: number;
          actief?: boolean;
        };
        Update: {
          naam?: string;
          volgorde?: number;
          actief?: boolean;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          lab_id: string;
          datum: string;
          start_tijd: string;
          eind_tijd: string;
          vak: string;
          school: string;
          docent: string;
          type_activiteit: ActiviteitType;
          aantal_leerlingen: number;
          bijzonderheden: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          lab_id: string;
          datum: string;
          start_tijd: string;
          eind_tijd: string;
          vak: string;
          school: string;
          docent: string;
          type_activiteit: ActiviteitType;
          aantal_leerlingen: number;
          bijzonderheden?: string | null;
          created_by?: string | null;
        };
        Update: {
          lab_id?: string;
          datum?: string;
          start_tijd?: string;
          eind_tijd?: string;
          vak?: string;
          school?: string;
          docent?: string;
          type_activiteit?: ActiviteitType;
          aantal_leerlingen?: number;
          bijzonderheden?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: false;
            referencedRelation: "labs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      manuals: {
        Row: {
          id: string;
          apparaat_naam: string;
          locatie: string | null;
          instructie_tekst: string | null;
          file_path: string | null;
          video_link: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          apparaat_naam: string;
          locatie?: string | null;
          instructie_tekst?: string | null;
          file_path?: string | null;
          video_link?: string | null;
          created_by?: string | null;
        };
        Update: {
          apparaat_naam?: string;
          locatie?: string | null;
          instructie_tekst?: string | null;
          file_path?: string | null;
          video_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "manuals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      claim_admin: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      markeer_bestellijst_als_besteld: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      toggle_task: {
        Args: { task_id: string };
        Returns: void;
      };
    };
  };
}
