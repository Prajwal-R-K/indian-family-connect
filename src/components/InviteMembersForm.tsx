
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidEmail, relationshipTypes, validateInviteForm } from "@/lib/utils";
import { InviteFormValues } from "@/types";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface InviteMembersFormProps {
  onAddMember: (member: InviteFormValues) => void;
  onRemoveMember: (email: string) => void;
  members: InviteFormValues[];
  onComplete: () => void;
  onBack: () => void;
}

const InviteMembersForm: React.FC<InviteMembersFormProps> = ({ 
  onAddMember, 
  onRemoveMember,
  members, 
  onComplete, 
  onBack 
}) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const form = useForm<InviteFormValues>({
    defaultValues: {
      email: "",
      relationship: "",
    },
  });
  
  const handleAddMember = () => {
    const values = form.getValues();
    const errors = validateInviteForm(values);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Check if email already exists in the list
    if (members.some(member => member.email === values.email)) {
      setFormErrors({ email: "This email has already been added" });
      return;
    }
    
    setFormErrors({});
    onAddMember(values);
    form.reset();
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Add Family Members</h3>
      <p className="text-sm text-gray-600">Invite at least one family member to create your family tree.</p>
      
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Family Member Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter their email address" 
                    {...field} 
                    className="isn-input" 
                  />
                </FormControl>
                {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="isn-input">
                      <SelectValue placeholder="Select their relationship to you" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.relationship && <p className="text-sm text-red-500">{formErrors.relationship}</p>}
              </FormItem>
            )}
          />
          
          <Button 
            type="button" 
            onClick={handleAddMember}
            className="w-full bg-isn-secondary hover:bg-isn-secondary/90"
          >
            Add Family Member
          </Button>
        </div>
      </Form>
      
      {members.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-2">Family Members to Invite:</h4>
          <div className="flex flex-wrap gap-2">
            {members.map((member, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-2">
                {member.email} ({member.relationship})
                <button 
                  onClick={() => onRemoveMember(member.email)}
                  className="text-gray-500 hover:text-red-500 focus:outline-none"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onComplete}
          className="flex-1 bg-isn-primary hover:bg-isn-primary/90"
          disabled={members.length === 0}
        >
          Complete Registration
        </Button>
      </div>
    </div>
  );
};

export default InviteMembersForm;
