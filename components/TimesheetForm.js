import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTimesheetOperations } from '../hooks/useTimesheetOperations';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { MapPin, Clock, Calendar, Building2, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TimesheetForm = ({ initialData = null, onSubmit, onCancel }) => {
  const { data: session } = useSession();
  const { saveTimesheetEntry, updateTimesheetEntry, loading, error } = useTimesheetOperations();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    work_order: '',
    notes: '',
    travel_start: '',
    travel_start_location: '',
    time_in: '',
    time_in_location: '',
    time_out: '',
    time_out_location: '',
    travel_home: '',
    travel_home_location: '',
    total_hours: 0,
    ...(initialData || {})
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const getCurrentLocation = async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              },
              address: data.display_name
            });
          } catch (error) {
            reject(new Error('Failed to get address from coordinates'));
          }
        },
        (error) => {
          reject(new Error('Failed to get current location'));
        }
      );
    });
  };

  const handleLocationClick = async (field) => {
    try {
      const locationData = await getCurrentLocation();
      const timeField = field.replace('_location', '');
      
      setFormData(prev => ({
        ...prev,
        [timeField]: new Date().toLocaleTimeString(),
        [field]: locationData.address
      }));

      toast.success('Location recorded successfully');
    } catch (err) {
      toast.error(`Failed to get location: ${err.message}`);
    }
  };

  const calculateTotalHours = () => {
    if (formData.time_in && formData.time_out) {
      const timeIn = new Date(\`${formData.date} ${formData.time_in}\`);
      const timeOut = new Date(\`${formData.date} ${formData.time_out}\`);
      const diff = (timeOut - timeIn) / (1000 * 60 * 60); // Convert to hours
      return Math.round(diff * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const totalHours = calculateTotalHours();
      const entry = {
        ...formData,
        total_hours: totalHours
      };

      if (initialData?.id) {
        await updateTimesheetEntry(initialData.id, entry);
      } else {
        await saveTimesheetEntry(entry);
      }

      toast.success(initialData ? 'Timesheet updated successfully' : 'Timesheet entry saved successfully');
      
      if (onSubmit) {
        onSubmit();
      }

      if (!initialData) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          customer_name: '',
          work_order: '',
          notes: '',
          travel_start: '',
          travel_start_location: '',
          time_in: '',
          time_in_location: '',
          time_out: '',
          time_out_location: '',
          travel_home: '',
          travel_home_location: '',
          total_hours: 0
        });
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <Input
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work_order">Work Order</Label>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <Input
                  id="work_order"
                  name="work_order"
                  value={formData.work_order}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Travel Start</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => handleLocationClick('travel_start_location')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Record Travel Start</span>
                </Button>
                <Input
                  value={formData.travel_start}
                  readOnly
                  placeholder="Time will appear here"
                  className="w-32 text-center"
                />
              </div>
              {formData.travel_start_location && (
                <p className="text-sm text-gray-500 mt-1">{formData.travel_start_location}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Time In</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => handleLocationClick('time_in_location')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Record Time In</span>
                </Button>
                <Input
                  value={formData.time_in}
                  readOnly
                  placeholder="Time will appear here"
                  className="w-32 text-center"
                  required
                />
              </div>
              {formData.time_in_location && (
                <p className="text-sm text-gray-500 mt-1">{formData.time_in_location}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time Out</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => handleLocationClick('time_out_location')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Record Time Out</span>
                </Button>
                <Input
                  value={formData.time_out}
                  readOnly
                  placeholder="Time will appear here"
                  className="w-32 text-center"
                  required
                />
              </div>
              {formData.time_out_location && (
                <p className="text-sm text-gray-500 mt-1">{formData.time_out_location}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Travel Home</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => handleLocationClick('travel_home_location')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Record Travel Home</span>
                </Button>
                <Input
                  value={formData.travel_home}
                  readOnly
                  placeholder="Time will appear here"
                  className="w-32 text-center"
                />
              </div>
              {formData.travel_home_location && (
                <p className="text-sm text-gray-500 mt-1">{formData.travel_home_location}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Hours</Label>
            <Input
              value={calculateTotalHours()}
              readOnly
              className="w-32 text-center font-bold"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (initialData ? 'Update' : 'Save')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default TimesheetForm;
