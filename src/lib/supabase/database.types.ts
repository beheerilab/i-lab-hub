export type Role = "admin" | "lid";

export type TaskStatus = "open" | "afgevinkt";

export type ActiviteitType =
  | "les"
  | "project"
  | "vrij_gebruik"
  | "extern_bezoek"
  | "evenement"
  | "vergadering"
  | "anders";

export type BoekingCategorie = "les" | "bijeenkomst";

export type OrderItemStatus = "actief" | "besteld" | "binnen";

export type ContactSoort = "leverancier" | "uitvoerder";

export type ContactBijlageType = "visitekaartje" | "contract" | "overig";

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
          status: OrderItemStatus;
          besteld_op: string | null;
          leverancier_id: string | null;
          binnen_op: string | null;
          factuur_aangevraagd: boolean;
          factuur_opgeslagen: boolean;
          factuurnaam: string | null;
          gearchiveerd: boolean;
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
          status?: OrderItemStatus;
          besteld_op?: string | null;
          leverancier_id?: string | null;
          binnen_op?: string | null;
          factuur_aangevraagd?: boolean;
          factuur_opgeslagen?: boolean;
          factuurnaam?: string | null;
          gearchiveerd?: boolean;
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
          {
            foreignKeyName: "order_items_leverancier_id_fkey";
            columns: ["leverancier_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          naam: string;
          soort: ContactSoort;
          categorie: string | null;
          telefoon: string | null;
          email: string | null;
          adres: string | null;
          notities: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          naam: string;
          soort?: ContactSoort;
          categorie?: string | null;
          telefoon?: string | null;
          email?: string | null;
          adres?: string | null;
          notities?: string | null;
          created_by?: string | null;
        };
        Update: {
          naam?: string;
          soort?: ContactSoort;
          categorie?: string | null;
          telefoon?: string | null;
          email?: string | null;
          adres?: string | null;
          notities?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contactpersonen: {
        Row: {
          id: string;
          contact_id: string;
          naam: string;
          functie: string | null;
          telefoon: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          contact_id: string;
          naam: string;
          functie?: string | null;
          telefoon?: string | null;
          email?: string | null;
        };
        Update: {
          naam?: string;
          functie?: string | null;
          telefoon?: string | null;
          email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contactpersonen_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_bijlagen: {
        Row: {
          id: string;
          contact_id: string;
          file_path: string;
          type: ContactBijlageType;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          contact_id: string;
          file_path: string;
          type?: ContactBijlageType;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "contact_bijlagen_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_bijlagen_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
          leverancier_id: string | null;
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
          leverancier_id?: string | null;
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
          leverancier_id?: string | null;
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
          {
            foreignKeyName: "tasks_leverancier_id_fkey";
            columns: ["leverancier_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      task_notities: {
        Row: {
          id: string;
          task_id: string;
          tekst: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          task_id: string;
          tekst: string;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "task_notities_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_notities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_shares: {
        Row: {
          task_id: string;
          profile_id: string;
        };
        Insert: {
          task_id: string;
          profile_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "task_shares_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_shares_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_bijlagen: {
        Row: {
          id: string;
          task_id: string;
          file_path: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          task_id: string;
          file_path: string;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "task_bijlagen_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_bijlagen_created_by_fkey";
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
          type_activiteit_anders: string | null;
          categorie: BoekingCategorie;
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
          type_activiteit_anders?: string | null;
          categorie?: BoekingCategorie;
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
          type_activiteit_anders?: string | null;
          categorie?: BoekingCategorie;
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
      sleutels: {
        Row: {
          id: string;
          naam: string;
          functie: string | null;
          sleutelnummer: string | null;
          tagnummer: string | null;
          telefoon: string | null;
          email: string | null;
          adres: string | null;
          opmerkingen: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          naam: string;
          functie?: string | null;
          sleutelnummer?: string | null;
          tagnummer?: string | null;
          telefoon?: string | null;
          email?: string | null;
          adres?: string | null;
          opmerkingen?: string | null;
          created_by?: string | null;
        };
        Update: {
          naam?: string;
          functie?: string | null;
          sleutelnummer?: string | null;
          tagnummer?: string | null;
          telefoon?: string | null;
          email?: string | null;
          adres?: string | null;
          opmerkingen?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sleutels_created_by_fkey";
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
      toggle_task: {
        Args: { task_id: string };
        Returns: void;
      };
      mag_taak_zien: {
        Args: { p_task_id: string };
        Returns: boolean;
      };
      is_taak_eigenaar: {
        Args: { p_task_id: string };
        Returns: boolean;
      };
    };
  };
}
