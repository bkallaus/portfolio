import React, { useState } from 'react';
import CalculationContainer from './container';
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

type Permission = 'read' | 'write' | 'execute';
type Entity = 'owner' | 'group' | 'public';

type PermissionsState = {
  [K in Entity]: {
    [P in Permission]: boolean;
  };
};

const defaultPermissions: PermissionsState = {
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  public: { read: true, write: false, execute: false },
};

const permissionValues: Record<Permission, number> = {
  read: 4,
  write: 2,
  execute: 1,
};

const UnixPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionsState>(defaultPermissions);
  const [octalValue, setOctalValue] = useState<string>('644');

  const calculateOctal = (perms: PermissionsState): string => {
    return ['owner', 'group', 'public'].map((entityStr) => {
      const entity = entityStr as Entity;
      let val = 0;
      if (perms[entity].read) val += permissionValues.read;
      if (perms[entity].write) val += permissionValues.write;
      if (perms[entity].execute) val += permissionValues.execute;
      return val.toString();
    }).join('');
  };

  const getSymbolic = (perms: PermissionsState): string => {
    return ['owner', 'group', 'public'].map((entityStr) => {
      const entity = entityStr as Entity;
      let sym = '';
      sym += perms[entity].read ? 'r' : '-';
      sym += perms[entity].write ? 'w' : '-';
      sym += perms[entity].execute ? 'x' : '-';
      return sym;
    }).join('');
  };

  const handleCheckboxChange = (entity: Entity, permission: Permission) => {
    const newPermissions = {
      ...permissions,
      [entity]: {
        ...permissions[entity],
        [permission]: !permissions[entity][permission],
      },
    };
    setPermissions(newPermissions);
    setOctalValue(calculateOctal(newPermissions));
  };

  const handleOctalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-7]/g, '').slice(0, 3);
    setOctalValue(val);

    if (val.length === 3) {
      const newPermissions = { ...permissions };
      ['owner', 'group', 'public'].forEach((entityStr, index) => {
        const entity = entityStr as Entity;
        const num = parseInt(val[index], 10);
        newPermissions[entity] = {
          read: (num & 4) !== 0,
          write: (num & 2) !== 0,
          execute: (num & 1) !== 0,
        };
      });
      setPermissions(newPermissions);
    }
  };

  return (
    <CalculationContainer>
      <div className="w-full flex flex-col gap-6 mt-4">
        <h4 className="text-center mb-0 text-xl font-semibold">Unix Permissions Calculator</h4>

        <div className="flex gap-4 flex-wrap">
          {['owner', 'group', 'public'].map((entityStr) => {
             const entity = entityStr as Entity;
             return (
               <div key={entity} className="flex-1 min-w-[100px] flex flex-col gap-2">
                 <strong className="capitalize">{entity}</strong>
                 <div className="flex items-center gap-2">
                   <Checkbox
                     id={`${entity}-read`}
                     checked={permissions[entity].read}
                     onCheckedChange={() => handleCheckboxChange(entity, 'read')}
                     aria-label={`${entity} read`}
                   />
                   <Label htmlFor={`${entity}-read`}>Read (4)</Label>
                 </div>
                 <div className="flex items-center gap-2">
                   <Checkbox
                     id={`${entity}-write`}
                     checked={permissions[entity].write}
                     onCheckedChange={() => handleCheckboxChange(entity, 'write')}
                     aria-label={`${entity} write`}
                   />
                   <Label htmlFor={`${entity}-write`}>Write (2)</Label>
                 </div>
                 <div className="flex items-center gap-2">
                   <Checkbox
                     id={`${entity}-execute`}
                     checked={permissions[entity].execute}
                     onCheckedChange={() => handleCheckboxChange(entity, 'execute')}
                     aria-label={`${entity} execute`}
                   />
                   <Label htmlFor={`${entity}-execute`}>Execute (1)</Label>
                 </div>
               </div>
             );
          })}
        </div>

        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Octal</Label>
            <Input
              type="text"
              value={octalValue}
              onChange={handleOctalChange}
              placeholder="644"
              className="mb-0"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Symbolic</Label>
            <Input
              type="text"
              value={getSymbolic(permissions)}
              readOnly
              className="mb-0 cursor-not-allowed bg-muted"
            />
          </div>
        </div>
      </div>
    </CalculationContainer>
  );
};

export default UnixPermissions;