import React, { ReactNode } from "react";

import { Card, CardContent } from "./ui/card";

const CalculationContainer = ({ children }: { children: ReactNode }) => {
  return (
    <Card className="m-0 border-none shadow-none bg-transparent sm:bg-card sm:border-solid sm:shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-center gap-6 p-6">
        {children}
      </CardContent>
    </Card>
  );
};

export default CalculationContainer;
